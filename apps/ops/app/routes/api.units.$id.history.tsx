import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getUnitHistory } from '~/lib/db.server';

export async function loader({ params, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const { id } = params;

  if (!id) {
    return json({ success: false, error: 'Unit ID required' }, { status: 400 });
  }

  try {
    const history = await getUnitHistory(db, id);
    return json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching unit history:', error);
    return json({ success: false, error: 'Failed to fetch unit history' }, { status: 500 });
  }
}
