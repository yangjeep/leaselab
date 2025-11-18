import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { Form, Link, useLoaderData, useNavigation, useActionData } from '@remix-run/react';
import { getPropertyById, createUnit } from '~/lib/db.server';
import { CreateUnitSchema } from '@leaselab/shared-config';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.property ? `New Unit - ${data.property.name} - LeaseLab.io` : 'New Unit - LeaseLab.io' }];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const { id } = params;

  if (!id) {
    throw new Response('Property ID required', { status: 400 });
  }

  const property = await getPropertyById(db, id);

  if (!property) {
    throw new Response('Property not found', { status: 404 });
  }

  return json({ property });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const { id: propertyId } = params;

  if (!propertyId) {
    return json({ error: 'Property ID required' }, { status: 400 });
  }

  const formData = await request.formData();

  const featuresStr = formData.get('features') as string;
  const features = featuresStr ? featuresStr.split(',').map(f => f.trim()).filter(Boolean) : [];

  const data = {
    unitNumber: formData.get('unitNumber') as string,
    name: formData.get('name') as string || undefined,
    bedrooms: parseInt(formData.get('bedrooms') as string),
    bathrooms: parseFloat(formData.get('bathrooms') as string),
    sqft: formData.get('sqft') ? parseInt(formData.get('sqft') as string) : undefined,
    rentAmount: parseFloat(formData.get('rentAmount') as string),
    depositAmount: formData.get('depositAmount') ? parseFloat(formData.get('depositAmount') as string) : undefined,
    floor: formData.get('floor') ? parseInt(formData.get('floor') as string) : undefined,
    features,
    availableDate: formData.get('availableDate') as string || undefined,
  };

  const parsed = CreateUnitSchema.safeParse(data);

  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  await createUnit(db, { propertyId, ...parsed.data });
  return redirect(`/admin/properties/${propertyId}`);
}

export default function NewUnit() {
  const { property } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to={`/admin/properties/${property.id}`} className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to {property.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Unit</h1>
        <p className="text-sm text-gray-500">{property.name}</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                <input
                  type="text"
                  name="unitNumber"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="101, A, Main"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Garden Suite"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms *</label>
                <input
                  type="number"
                  name="bedrooms"
                  min="0"
                  max="20"
                  defaultValue="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms *</label>
                <input
                  type="number"
                  name="bathrooms"
                  min="0"
                  max="20"
                  step="0.5"
                  defaultValue="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                <input
                  type="number"
                  name="sqft"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent *</label>
                <input
                  type="number"
                  name="rentAmount"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit</label>
                <input
                  type="number"
                  name="depositAmount"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <input
                  type="number"
                  name="floor"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
                <input
                  type="date"
                  name="availableDate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
              <input
                type="text"
                name="features"
                placeholder="Washer/Dryer, Balcony, Updated Kitchen"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link
                to={`/admin/properties/${property.id}`}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Unit'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
