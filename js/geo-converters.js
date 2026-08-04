/* abcGEO — browser spatial format converters */
(function () {
  'use strict';

  const GeoConvert = {
    escapeXml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },

    parseGeoJSON(text) {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        throw new Error('Input is not a JSON object.');
      }
      if (data.type === 'FeatureCollection') return data;
      if (data.type === 'Feature') {
        return { type: 'FeatureCollection', features: [data] };
      }
      if (data.type && data.coordinates !== undefined) {
        return {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: data }],
        };
      }
      throw new Error('Expected a GeoJSON FeatureCollection, Feature, or Geometry.');
    },

    coordsToKml(coords, type) {
      if (type === 'Point') {
        const [lon, lat, alt] = coords;
        return `${lon},${lat}${alt != null ? `,${alt}` : ''}`;
      }
      if (type === 'LineString' || type === 'LinearRing') {
        return coords
          .map((c) => `${c[0]},${c[1]}${c[2] != null ? `,${c[2]}` : ''}`)
          .join(' ');
      }
      if (type === 'Polygon') {
        return coords.map((ring) => this.coordsToKml(ring, 'LinearRing'));
      }
      return '';
    },

    geometryToKml(geometry) {
      if (!geometry || !geometry.type) return '';
      const { type, coordinates } = geometry;

      if (type === 'Point') {
        return `<Point><coordinates>${this.coordsToKml(coordinates, 'Point')}</coordinates></Point>`;
      }
      if (type === 'MultiPoint') {
        return coordinates
          .map(
            (c) =>
              `<Point><coordinates>${this.coordsToKml(c, 'Point')}</coordinates></Point>`
          )
          .join('');
      }
      if (type === 'LineString') {
        return `<LineString><coordinates>${this.coordsToKml(coordinates, 'LineString')}</coordinates></LineString>`;
      }
      if (type === 'MultiLineString') {
        return `<MultiGeometry>${coordinates
          .map(
            (line) =>
              `<LineString><coordinates>${this.coordsToKml(line, 'LineString')}</coordinates></LineString>`
          )
          .join('')}</MultiGeometry>`;
      }
      if (type === 'Polygon') {
        const rings = this.coordsToKml(coordinates, 'Polygon');
        const outer = rings[0] || '';
        const inners = rings.slice(1)
          .map((r) => `<innerBoundaryIs><LinearRing><coordinates>${r}</coordinates></LinearRing></innerBoundaryIs>`)
          .join('');
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${outer}</coordinates></LinearRing></outerBoundaryIs>${inners}</Polygon>`;
      }
      if (type === 'MultiPolygon') {
        return `<MultiGeometry>${coordinates
          .map((poly) => this.geometryToKml({ type: 'Polygon', coordinates: poly }))
          .join('')}</MultiGeometry>`;
      }
      if (type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
        return `<MultiGeometry>${geometry.geometries.map((g) => this.geometryToKml(g)).join('')}</MultiGeometry>`;
      }
      throw new Error(`Unsupported geometry type: ${type}`);
    },

    featureToKmlPlacemark(feature, index) {
      const props = feature.properties || {};
      const name =
        props.name || props.Name || props.title || props.id || `Feature ${index + 1}`;
      const descriptionKeys = Object.keys(props).filter(
        (k) => !['name', 'Name', 'title'].includes(k)
      );
      const description = descriptionKeys.length
        ? descriptionKeys
            .map((k) => `<strong>${this.escapeXml(k)}</strong>: ${this.escapeXml(props[k])}`)
            .join('<br/>')
        : '';
      const geom = feature.geometry ? this.geometryToKml(feature.geometry) : '';
      return `  <Placemark>
    <name>${this.escapeXml(name)}</name>
    ${description ? `<description><![CDATA[${description}]]></description>` : ''}
    ${geom}
  </Placemark>`;
    },

    geojsonToKml(text) {
      const fc = this.parseGeoJSON(text);
      const placemarks = (fc.features || [])
        .map((f, i) => this.featureToKmlPlacemark(f, i))
        .join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>abcGEO GeoJSON to KML</name>
${placemarks}
</Document>
</kml>
`;
    },

    parseKmlCoordinates(text) {
      return String(text)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((tuple) => {
          const parts = tuple.split(',').map(Number);
          if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) {
            throw new Error(`Invalid KML coordinate tuple: ${tuple}`);
          }
          return parts.length >= 3 ? [parts[0], parts[1], parts[2]] : [parts[0], parts[1]];
        });
    },

    kmlGeometryToGeoJSON(el) {
      const tag = el.localName || el.tagName;
      if (!tag) return null;
      const name = tag.replace(/^.*:/, '');

      if (name === 'Point') {
        const coordsEl = el.getElementsByTagNameNS('*', 'coordinates')[0] || el.querySelector('coordinates');
        if (!coordsEl) return null;
        const coords = this.parseKmlCoordinates(coordsEl.textContent)[0];
        return { type: 'Point', coordinates: coords };
      }
      if (name === 'LineString') {
        const coordsEl = el.getElementsByTagNameNS('*', 'coordinates')[0] || el.querySelector('coordinates');
        if (!coordsEl) return null;
        return { type: 'LineString', coordinates: this.parseKmlCoordinates(coordsEl.textContent) };
      }
      if (name === 'Polygon') {
        const outer =
          el.getElementsByTagNameNS('*', 'outerBoundaryIs')[0] ||
          el.querySelector('outerBoundaryIs');
        const outerCoordsEl =
          (outer &&
            (outer.getElementsByTagNameNS('*', 'coordinates')[0] ||
              outer.querySelector('coordinates'))) ||
          null;
        if (!outerCoordsEl) return null;
        const coordinates = [this.parseKmlCoordinates(outerCoordsEl.textContent)];
        const inners = el.getElementsByTagNameNS('*', 'innerBoundaryIs');
        for (let i = 0; i < inners.length; i += 1) {
          const innerCoords =
            inners[i].getElementsByTagNameNS('*', 'coordinates')[0] ||
            inners[i].querySelector('coordinates');
          if (innerCoords) coordinates.push(this.parseKmlCoordinates(innerCoords.textContent));
        }
        return { type: 'Polygon', coordinates };
      }
      if (name === 'MultiGeometry') {
        const children = Array.from(el.children || []);
        const geometries = children
          .map((child) => this.kmlGeometryToGeoJSON(child))
          .filter(Boolean);
        if (!geometries.length) return null;
        const types = new Set(geometries.map((g) => g.type));
        if (types.size === 1 && types.has('Point')) {
          return { type: 'MultiPoint', coordinates: geometries.map((g) => g.coordinates) };
        }
        if (types.size === 1 && types.has('LineString')) {
          return { type: 'MultiLineString', coordinates: geometries.map((g) => g.coordinates) };
        }
        if (types.size === 1 && types.has('Polygon')) {
          return { type: 'MultiPolygon', coordinates: geometries.map((g) => g.coordinates) };
        }
        return { type: 'GeometryCollection', geometries };
      }
      return null;
    },

    kmlToGeojson(text) {
      const trimmed = text.trim();
      if (!trimmed) throw new Error('KML input is empty.');
      const doc = new DOMParser().parseFromString(trimmed, 'application/xml');
      if (doc.querySelector('parsererror')) {
        throw new Error('Invalid XML/KML. Check that the document is well-formed.');
      }

      const placemarks = Array.from(doc.getElementsByTagNameNS('*', 'Placemark'));
      const features = [];

      placemarks.forEach((pm, index) => {
        const nameEl = pm.getElementsByTagNameNS('*', 'name')[0];
        const descEl = pm.getElementsByTagNameNS('*', 'description')[0];
        const properties = {};
        if (nameEl?.textContent) properties.name = nameEl.textContent.trim();
        if (descEl?.textContent) properties.description = descEl.textContent.trim();

        let geometry = null;
        const candidates = Array.from(pm.children || []);
        for (const child of candidates) {
          const local = (child.localName || child.tagName || '').replace(/^.*:/, '');
          if (['Point', 'LineString', 'Polygon', 'MultiGeometry'].includes(local)) {
            geometry = this.kmlGeometryToGeoJSON(child);
            if (geometry) break;
          }
        }

        if (!geometry) {
          // Nested folders sometimes wrap geometry deeper
          const deepPoint = pm.getElementsByTagNameNS('*', 'Point')[0];
          const deepLine = pm.getElementsByTagNameNS('*', 'LineString')[0];
          const deepPoly = pm.getElementsByTagNameNS('*', 'Polygon')[0];
          const deepMulti = pm.getElementsByTagNameNS('*', 'MultiGeometry')[0];
          const target = deepMulti || deepPoly || deepLine || deepPoint;
          if (target) geometry = this.kmlGeometryToGeoJSON(target);
        }

        if (geometry) {
          features.push({
            type: 'Feature',
            properties: Object.keys(properties).length ? properties : { id: index + 1 },
            geometry,
          });
        }
      });

      if (!features.length) {
        throw new Error('No Placemark geometries found in KML.');
      }

      return JSON.stringify(
        { type: 'FeatureCollection', features },
        null,
        2
      );
    },

    parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (inQuotes) {
          if (ch === '"' && next === '"') {
            cell += '"';
            i += 1;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cell += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(cell);
          cell = '';
        } else if (ch === '\n') {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
        } else if (ch === '\r') {
          // ignore
        } else {
          cell += ch;
        }
      }
      row.push(cell);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      return rows;
    },

    detectLonLat(headers) {
      const lower = headers.map((h) => h.trim().toLowerCase());
      const lonNames = ['longitude', 'lon', 'lng', 'long', 'x'];
      const latNames = ['latitude', 'lat', 'y'];
      let lon = -1;
      let lat = -1;
      lonNames.forEach((n) => {
        const idx = lower.indexOf(n);
        if (idx !== -1 && lon === -1) lon = idx;
      });
      latNames.forEach((n) => {
        const idx = lower.indexOf(n);
        if (idx !== -1 && lat === -1) lat = idx;
      });
      return { lon, lat };
    },

    detectWkt(headers) {
      const lower = headers.map((h) => h.trim().toLowerCase());
      const names = ['wkt', 'geometry', 'geom', 'the_geom', 'shape'];
      for (const n of names) {
        const idx = lower.indexOf(n);
        if (idx !== -1) return idx;
      }
      return -1;
    },

    parseWktPoint(wkt) {
      const m = String(wkt)
        .trim()
        .match(/^POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)$/i);
      if (!m) return null;
      return { type: 'Point', coordinates: [Number(m[1]), Number(m[2])] };
    },

    csvToGeojson(text, options = {}) {
      const rows = this.parseCsv(text.trim());
      if (rows.length < 2) throw new Error('CSV needs a header row and at least one data row.');
      const headers = rows[0].map((h) => h.trim());
      const { lon: lonIdxAuto, lat: latIdxAuto } = this.detectLonLat(headers);
      const wktIdx = this.detectWkt(headers);
      const lonIdx = options.lonIndex != null ? options.lonIndex : lonIdxAuto;
      const latIdx = options.latIndex != null ? options.latIndex : latIdxAuto;

      if (wktIdx === -1 && (lonIdx === -1 || latIdx === -1)) {
        throw new Error(
          'Could not find longitude/latitude columns (or a WKT geometry column). Name columns longitude/latitude, lon/lat, or wkt.'
        );
      }

      const features = [];
      for (let r = 1; r < rows.length; r += 1) {
        const cells = rows[r];
        if (!cells || cells.every((c) => String(c).trim() === '')) continue;
        const properties = {};
        headers.forEach((h, i) => {
          if (i === lonIdx || i === latIdx || i === wktIdx) return;
          properties[h || `col_${i}`] = cells[i] ?? '';
        });

        let geometry = null;
        if (wktIdx !== -1 && cells[wktIdx]) {
          geometry = this.parseWktPoint(cells[wktIdx]);
          if (!geometry) {
            // keep raw WKT as property if not a simple POINT
            properties.wkt = cells[wktIdx];
            throw new Error(
              `Row ${r + 1}: only POINT WKT is supported in-browser right now. Use lon/lat columns for points, or convert complex WKT in GIS.`
            );
          }
        } else {
          const lon = Number(cells[lonIdx]);
          const lat = Number(cells[latIdx]);
          if (Number.isNaN(lon) || Number.isNaN(lat)) {
            throw new Error(`Row ${r + 1}: invalid longitude/latitude values.`);
          }
          geometry = { type: 'Point', coordinates: [lon, lat] };
        }

        features.push({ type: 'Feature', properties, geometry });
      }

      if (!features.length) throw new Error('No valid features parsed from CSV.');
      return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
    },

    toWkt(geometry) {
      if (!geometry) return '';
      const { type, coordinates } = geometry;
      const fmt = (c) => (c.length > 2 ? `${c[0]} ${c[1]} ${c[2]}` : `${c[0]} ${c[1]}`);
      if (type === 'Point') return `POINT (${fmt(coordinates)})`;
      if (type === 'LineString') return `LINESTRING (${coordinates.map(fmt).join(', ')})`;
      if (type === 'Polygon') {
        return `POLYGON (${coordinates.map((ring) => `(${ring.map(fmt).join(', ')})`).join(', ')})`;
      }
      if (type === 'MultiPoint') {
        return `MULTIPOINT (${coordinates.map(fmt).join(', ')})`;
      }
      if (type === 'MultiLineString') {
        return `MULTILINESTRING (${coordinates
          .map((line) => `(${line.map(fmt).join(', ')})`)
          .join(', ')})`;
      }
      if (type === 'MultiPolygon') {
        return `MULTIPOLYGON (${coordinates
          .map((poly) => `(${poly.map((ring) => `(${ring.map(fmt).join(', ')})`).join(', ')})`)
          .join(', ')})`;
      }
      return '';
    },

    csvEscape(value) {
      const str = value == null ? '' : String(value);
      if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    },

    geojsonToCsv(text) {
      const fc = this.parseGeoJSON(text);
      const features = fc.features || [];
      if (!features.length) throw new Error('GeoJSON has no features.');

      const propKeys = new Set();
      let allPoints = true;
      features.forEach((f) => {
        Object.keys(f.properties || {}).forEach((k) => propKeys.add(k));
        if (!f.geometry || f.geometry.type !== 'Point') allPoints = false;
      });

      const keys = Array.from(propKeys);
      let headers;
      let rows;

      if (allPoints) {
        headers = [...keys, 'longitude', 'latitude'];
        rows = features.map((f) => {
          const props = f.properties || {};
          const [lon, lat] = f.geometry.coordinates;
          return [...keys.map((k) => this.csvEscape(props[k])), lon, lat].join(',');
        });
      } else {
        headers = [...keys, 'wkt', 'geometry_type'];
        rows = features.map((f) => {
          const props = f.properties || {};
          const geom = f.geometry;
          return [
            ...keys.map((k) => this.csvEscape(props[k])),
            this.csvEscape(this.toWkt(geom)),
            this.csvEscape(geom?.type || ''),
          ].join(',');
        });
      }

      return `${headers.map((h) => this.csvEscape(h)).join(',')}\n${rows.join('\n')}\n`;
    },
  };

  const SAMPLES = {
    'geojson-to-kml': `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "City Hall", "city": "San Francisco" },
      "geometry": { "type": "Point", "coordinates": [-122.4194, 37.7749] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Market St segment" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[-122.4194, 37.7749], [-122.4056, 37.7859]]
      }
    }
  ]
}`,
    'kml-to-geojson': `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>City Hall</name>
      <Point><coordinates>-122.4194,37.7749,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Ferry Building</name>
      <Point><coordinates>-122.3933,37.7955,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`,
    'csv-to-geojson': `id,name,longitude,latitude
1,City Hall,-122.4194,37.7749
2,Ferry Building,-122.3933,37.7955
3,Coit Tower,-122.4058,37.8024`,
    'geojson-to-csv': `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": 1, "name": "City Hall" },
      "geometry": { "type": "Point", "coordinates": [-122.4194, 37.7749] }
    },
    {
      "type": "Feature",
      "properties": { "id": 2, "name": "Ferry Building" },
      "geometry": { "type": "Point", "coordinates": [-122.3933, 37.7955] }
    }
  ]
}`,
  };

  async function convert(mode, inputText, file) {
    if (mode === 'geojson-to-kml') return GeoConvert.geojsonToKml(inputText);
    if (mode === 'kml-to-geojson') return GeoConvert.kmlToGeojson(inputText);
    if (mode === 'csv-to-geojson') return GeoConvert.csvToGeojson(inputText);
    if (mode === 'geojson-to-csv') return GeoConvert.geojsonToCsv(inputText);
    if (mode === 'shapefile-to-geojson') {
      if (!file) throw new Error('Choose a zipped Shapefile (.zip) containing .shp, .shx, and .dbf.');
      const parser = typeof shp === 'function' ? shp : window.shp;
      if (!parser) {
        throw new Error('Shapefile library failed to load. Check your network and reload.');
      }
      const buffer = await file.arrayBuffer();
      let geojson;
      if (typeof parser.parseZip === 'function') {
        geojson = await parser.parseZip(buffer);
      } else if (typeof parser === 'function') {
        geojson = await parser(buffer);
      } else {
        throw new Error('Unsupported shpjs build. Expected shp() or shp.parseZip().');
      }
      // shpjs may return a FeatureCollection or an array of layers
      if (Array.isArray(geojson)) {
        const features = geojson.flatMap((layer) => layer.features || []);
        return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
      }
      return JSON.stringify(geojson, null, 2);
    }
    throw new Error(`Unknown converter mode: ${mode}`);
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function initConverter(root) {
    const mode = root.dataset.geoConverter;
    const input = root.querySelector('[data-convert-input]');
    const output = root.querySelector('[data-convert-output]');
    const status = root.querySelector('[data-convert-status]');
    const fileInput = root.querySelector('[data-convert-file]');
    const convertBtn = root.querySelector('[data-convert-run]');
    const sampleBtn = root.querySelector('[data-convert-sample]');
    const copyBtn = root.querySelector('[data-convert-copy]');
    const downloadBtn = root.querySelector('[data-convert-download]');
    const clearBtn = root.querySelector('[data-convert-clear]');
    const outputExt = root.dataset.outputExt || 'txt';
    const outputMime = root.dataset.outputMime || 'text/plain';
    const outputName = root.dataset.outputName || `abcgeo-converted.${outputExt}`;

    let uploadedFile = null;

    function setStatus(message, type) {
      if (!status) return;
      status.textContent = message || '';
      status.dataset.state = type || '';
      status.hidden = !message;
    }

    async function run() {
      try {
        setStatus('Converting…', 'info');
        const text = input?.value || '';
        if (mode !== 'shapefile-to-geojson' && !text.trim()) {
          throw new Error('Paste input data or load a sample / file first.');
        }
        const result = await convert(mode, text, uploadedFile);
        if (output) output.value = result;
        const countHint =
          mode.includes('geojson') && result.trim().startsWith('{')
            ? (() => {
                try {
                  const parsed = JSON.parse(result);
                  return parsed.features ? ` · ${parsed.features.length} feature(s)` : '';
                } catch {
                  return '';
                }
              })()
            : '';
        setStatus(`Conversion complete${countHint}.`, 'success');
      } catch (err) {
        setStatus(err.message || 'Conversion failed.', 'error');
      }
    }

    convertBtn?.addEventListener('click', run);

    sampleBtn?.addEventListener('click', () => {
      if (mode === 'shapefile-to-geojson') {
        setStatus(
          'Shapefile conversion needs a .zip upload (include .shp, .shx, .dbf, and ideally .prj).',
          'info'
        );
        return;
      }
      if (input && SAMPLES[mode]) {
        input.value = SAMPLES[mode];
        setStatus('Sample loaded. Click Convert to run.', 'info');
      }
    });

    fileInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      uploadedFile = file;
      if (mode === 'shapefile-to-geojson') {
        if (input) input.value = `Loaded ZIP: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        setStatus('Shapefile ZIP ready. Click Convert.', 'info');
        return;
      }
      try {
        const text = await file.text();
        if (input) input.value = text;
        setStatus(`Loaded ${file.name}. Click Convert.`, 'info');
      } catch {
        setStatus('Could not read that file as text.', 'error');
      }
    });

    copyBtn?.addEventListener('click', async () => {
      const value = output?.value || '';
      if (!value) {
        setStatus('Nothing to copy yet.', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        copyBtn.textContent = 'Copied';
        setTimeout(() => {
          copyBtn.textContent = 'Copy output';
        }, 1500);
      } catch {
        setStatus('Clipboard copy failed.', 'error');
      }
    });

    downloadBtn?.addEventListener('click', () => {
      const value = output?.value || '';
      if (!value) {
        setStatus('Nothing to download yet.', 'error');
        return;
      }
      downloadText(outputName, value, outputMime);
      setStatus(`Downloaded ${outputName}.`, 'success');
    });

    clearBtn?.addEventListener('click', () => {
      if (input) input.value = '';
      if (output) output.value = '';
      if (fileInput) fileInput.value = '';
      uploadedFile = null;
      setStatus('', '');
    });
  }

  document.querySelectorAll('[data-geo-converter]').forEach(initConverter);
  window.abcGEO = window.abcGEO || {};
  window.abcGEO.GeoConvert = GeoConvert;
})();
