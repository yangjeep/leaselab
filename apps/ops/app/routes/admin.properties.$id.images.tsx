import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useRevalidator } from '@remix-run/react';
import { getPropertyById, getImagesByEntity } from '~/lib/db.server';
import { ImageUploader } from '~/components/ImageUploader';
import type { PropertyImage } from '@leaselab/shared-types';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.property ? `Images - ${data.property.name} - LeaseLab.io` : 'Images - LeaseLab.io' }];
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

  const images = await getImagesByEntity(db, 'property', id);

  // Generate URLs for images
  const baseUrl = context.cloudflare.env.R2_PUBLIC_URL || '';
  const imagesWithUrls = images.map(img => ({
    ...img,
    url: baseUrl ? `${baseUrl}/${img.r2Key}` : `/api/images/${img.id}/file`,
  }));

  return json({ property, images: imagesWithUrls });
}

export default function PropertyImages() {
  const { property, images } = useLoaderData<typeof loader>();
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
        <Link to={`/admin/properties/${property.id}`} className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
          ← Back to {property.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Property Images</h1>
        <p className="text-sm text-gray-500">{property.name}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <ImageUploader
          entityType="property"
          entityId={property.id}
          images={images as PropertyImage[]}
          onUploadComplete={handleUploadComplete}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
        />
      </div>
    </div>
  );
}
