import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useRevalidator } from '@remix-run/react';
import { getUnitById, getPropertyById, getImagesByEntity } from '~/lib/db.server';
import { ImageUploader } from '~/components/ImageUploader';
import type { PropertyImage } from '@leaselab/shared-types';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.unit ? `Images - Unit ${data.unit.unitNumber} - LeaseLab.io` : 'Images - LeaseLab.io' }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    throw new Response('Unit ID required', { status: 400 });
  }

  const unit = await getUnitById(db, siteId, id);

  if (!unit) {
    throw new Response('Unit not found', { status: 404 });
  }

  const property = await getPropertyById(db, siteId, unit.propertyId);
  const images = await getImagesByEntity(db, siteId, 'unit', id);

  // Generate URLs for images
  const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
  const imagesWithUrls = images.map(img => ({
    ...img,
    url: baseUrl ? `${baseUrl}/${img.r2Key}` : `/api/images/${img.id}/file`,
  }));

  return json({ unit, property, images: imagesWithUrls });
}

export default function UnitImages() {
  const { unit, property, images } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const handleUploadComplete = () => {
    revalidator.revalidate();
  };

  const handleDelete = () => {
    revalidator.revalidate();
  };

  const handleSetCover = () => {
    revalidator.revalidate();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to={`/admin/units/${unit.id}`} className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to Unit {unit.unitNumber}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Unit Images</h1>
        <p className="text-sm text-gray-500">
          {property?.name} - Unit {unit.unitNumber}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <ImageUploader
          entityType="unit"
          entityId={unit.id}
          images={images as PropertyImage[]}
          onUploadComplete={handleUploadComplete}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
        />
      </div>
    </div>
  );
}
