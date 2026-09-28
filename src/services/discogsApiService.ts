export interface DiscogsIdentity {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}

export interface DiscogsPriceSuggestions {
  'Mint (M)'?: { value: number; currency: string };
  'Near Mint (NM or M-)'?: { value: number; currency: string };
  'Very Good Plus (VG+)'?: { value: number; currency: string };
  'Very Good (VG)'?: { value: number; currency: string };
  'Good Plus (G+)'?: { value: number; currency: string };
  'Good (G)'?: { value: number; currency: string };
  'Fair (F)'?: { value: number; currency: string };
  'Poor (P)'?: { value: number; currency: string };
}

/**
 * Tests connection with a user-provided Discogs Personal Access Token
 */
export async function testDiscogsToken(token: string): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  if (!token || token.trim().length === 0) {
    return { success: false, error: 'Token cannot be empty' };
  }

  try {
    const res = await fetch('https://api.discogs.com/oauth/identity', {
      headers: {
        Authorization: `Discogs token=${token.trim()}`,
        'User-Agent': 'GroovePriceApp/1.0',
      },
    });

    if (res.ok) {
      const data: DiscogsIdentity = await res.json();
      return { success: true, username: data.username };
    } else {
      return {
        success: false,
        error: `Discogs API error: HTTP ${res.status} ${res.statusText}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error connecting to Discogs API',
    };
  }
}

/**
 * Fetches price suggestions from Discogs for a specific release ID
 */
export async function fetchDiscogsPriceSuggestions(
  releaseId: number,
  token?: string
): Promise<DiscogsPriceSuggestions | null> {
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`,
      {
        headers: {
          Authorization: `Discogs token=${token.trim()}`,
          'User-Agent': 'GroovePriceApp/1.0',
        },
      }
    );

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}
