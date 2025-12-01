import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useRevalidator } from '@remix-run/react';
import { fetchUnitFromWorker, fetchPropertyFromWorker, fetchImagesFromWorker } from '~/lib/worker-client';
import { ImageUploader } from '~/components/ImageUploader';
import type { PropertyImage } from '~/shared/types';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.unit ? `Images - Unit ${data.unit.unitNumber} - LeaseLab.io` : 'Images - LeaseLab.io' }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const { id } = params;

  if (!id) {
    throw new Response('Unit ID required', { status: 400 });
  }

  const unit = await fetchUnitFromWorker(workerEnv, siteId, id);

  if (!unit) {
    throw new Response('Unit not found', { status: 404 });
  }

  const property = await fetchPropertyFromWorker(workerEnv, siteId, unit.propertyId);
  const images = await fetchImagesFromWorker(workerEnv, siteId, 'unit', id);

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

  const handleUploadComplete = (newImage: PropertyImage) => {
    revalidator.revalidate();
  };

  const handleDelete = (imageId: string) => {
    revalidator.revalidate();
  };

  const handleSetCover = (imageId: string) => {
    revalidator.revalidate();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            to={`/admin/units/${unit.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-flex items-center gap-1"
          >
            <span>←</span> Back to Unit
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Manage Images</h1>
          <p className="text-gray-500 mt-1">
            {property?.name} - Unit {unit.unitNumber}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ImageUploader
          entityType="unit"
          entityId={unit.id}
          images={images}
          onUploadComplete={handleUploadComplete}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
        />
      </div>
    </div>
  );
}
