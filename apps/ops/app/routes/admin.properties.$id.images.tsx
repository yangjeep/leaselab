import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useRevalidator } from '@remix-run/react';
import { getPropertyById, getImagesByEntity } from '~/lib/db.server';
import { getSiteId } from '~/lib/site.server';
import { ImageUploader } from '~/components/ImageUploader';
import type { PropertyImage } from '@leaselab/shared-types';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.property ? `Manage Images - ${data.property.name}` : 'Manage Images' }];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const { id } = params;

  if (!id) {
    throw new Response('Property ID required', { status: 400 });
  }

  const property = await getPropertyById(db, siteId, id);

  if (!property) {
    throw new Response('Property not found', { status: 404 });
  }

  // Fetch images for the property
  const images = await getImagesByEntity(db, siteId, 'property', id);

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
            to={`/admin/properties/${property.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-flex items-center gap-1"
          >
            <span>←</span> Back to Property
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Manage Images</h1>
          <p className="text-gray-500 mt-1">{property.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ImageUploader
          entityType="property"
          entityId={property.id}
          images={images}
          onUploadComplete={handleUploadComplete}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
        />
      </div>
    </div>
  );
}
