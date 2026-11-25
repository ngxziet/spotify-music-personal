import { NextRequest, NextResponse } from 'next/server';
import { getAudiusPlaylistById } from '../../search/audius';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id.startsWith('audius-pl-')) {
    return NextResponse.json({ playlist: null }, { status: 404 });
  }
  const playlist = await getAudiusPlaylistById(id);
  if (!playlist) {
    return NextResponse.json({ playlist: null }, { status: 404 });
  }
  return NextResponse.json({ playlist });
}
