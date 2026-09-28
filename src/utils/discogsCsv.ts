import { InventoryItem, GoldmineGrade, SleeveGrade, ListingStatus } from '../types/discogs';

/**
 * Escapes a CSV field per RFC 4180
 */
function escapeCsv(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports inventory items to official Discogs Inventory CSV format
 */
export function exportToDiscogsCsv(items: InventoryItem[]): string {
  const headers = [
    'listing_id',
    'release_id',
    'price',
    'media_condition',
    'sleeve_condition',
    'comments',
    'allow_offers',
    'status',
    'external_id',
    'location',
    'weight',
    'format_quantity',
  ];

  const rows = items.map((item) => {
    return [
      escapeCsv(item.id),
      escapeCsv(item.releaseId),
      escapeCsv(item.price.toFixed(2)),
      escapeCsv(item.mediaCondition),
      escapeCsv(item.sleeveCondition),
      escapeCsv(item.comments),
      escapeCsv('N'), // allow_offers
      escapeCsv(item.status === 'For Sale' ? 'For Sale' : 'Draft'),
      escapeCsv(item.catno),
      escapeCsv(item.location),
      escapeCsv(item.weightGrams || 230),
      escapeCsv(1),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parses Discogs CSV text into InventoryItem objects
 */
export function parseDiscogsCsv(csvContent: string): Partial<InventoryItem>[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine).map((h) => h.trim().toLowerCase());

  const parsedItems: Partial<InventoryItem>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCsvRow(lines[i]);
    if (rowValues.length === 0) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, index) => {
      rowObj[h] = rowValues[index] || '';
    });

    const releaseId = Number(rowObj['release_id'] || rowObj['releaseid'] || '0');
    const price = parseFloat(rowObj['price'] || '0') || 10.0;
    const listingId = rowObj['listing_id'] || `inv-imp-${Date.now()}-${i}`;
    const mediaCondition = (rowObj['media_condition'] || 'Very Good Plus (VG+)') as GoldmineGrade;
    const sleeveCondition = (rowObj['sleeve_condition'] || 'Very Good (VG)') as SleeveGrade;
    const status = (rowObj['status'] === 'For Sale' ? 'For Sale' : 'Draft') as ListingStatus;
    const comments = rowObj['comments'] || '';
    const location = rowObj['location'] || 'CRATE-NEW-IMPORT';
    const catno = rowObj['external_id'] || rowObj['catno'] || 'UNKNOWN';

    parsedItems.push({
      id: listingId,
      releaseId: releaseId || Math.floor(100000 + Math.random() * 900000),
      title: rowObj['title'] || `Imported Release #${releaseId || i}`,
      artist: rowObj['artist'] || 'Various Artists',
      label: rowObj['label'] || 'Independent',
      catno,
      year: parseInt(rowObj['year'] || '0', 10) || new Date().getFullYear(),
      country: rowObj['country'] || 'US',
      format: rowObj['format'] || 'Vinyl, LP',
      genre: ['Import'],
      mediaCondition,
      sleeveCondition,
      price,
      originalCost: parseFloat((price * 0.45).toFixed(2)),
      floorPrice: parseFloat((price * 0.65).toFixed(2)),
      ceilingPrice: parseFloat((price * 1.8).toFixed(2)),
      status,
      location,
      comments,
      weightGrams: parseInt(rowObj['weight'] || '230', 10) || 230,
      dateListed: new Date().toISOString(),
      lastPriceUpdated: new Date().toISOString(),
      inCollection: false,
      marketStats: {
        lowest: parseFloat((price * 0.85).toFixed(2)),
        median: price,
        highest: parseFloat((price * 1.45).toFixed(2)),
        lastSoldDate: new Date().toISOString().split('T')[0],
        numForSale: 12,
        wantCount: 500,
        haveCount: 1200,
        suggestedConditionPrice: price,
      },
    });
  }

  return parsedItems;
}

/**
 * RFC 4180 simple compliant CSV row splitter
 */
function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Triggers browser download of a text/csv file
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
