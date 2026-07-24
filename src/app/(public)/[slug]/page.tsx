// ============================================
// AssistMint — Public Business Page
// assistmint.novamintnetworks.in/[slug]
// SEO-optimized public page with menu/services
// ============================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBusinessBySlug, type PublicBusinessData } from '@/lib/actions/public-page';
import { getBusinessTypeConfig } from '@/lib/utils/business-types';
import Link from 'next/link';
import Image from 'next/image';

// ─── Dynamic Metadata (SEO) ────────────────

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: 'Business Not Found — AssistMint' };

  const config = getBusinessTypeConfig(business.business_type);
  const itemCount = business.menu_categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return {
    title: `${business.name} — ${config.sidebar.menu} & Ordering | AssistMint`,
    description: business.description || `Browse ${itemCount} ${config.sidebar.menu.toLowerCase()} from ${business.name}. Order instantly on WhatsApp. ${business.address || ''}`,
    openGraph: {
      title: `${business.name} — Order on WhatsApp`,
      description: `Browse ${config.sidebar.menu.toLowerCase()} and order instantly via WhatsApp from ${business.name}.`,
      type: 'website',
      url: `https://assistmint.novamintnetworks.in/${slug}`,
    },
  };
}

// ─── Page Component ─────────────────────────

export default async function PublicBusinessPage({ params }: { params: Params }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const config = getBusinessTypeConfig(business.business_type);
  const whatsappLink = business.whatsapp_phone
    ? `https://wa.me/91${business.whatsapp_phone.replace(/\D/g, '').replace(/^91/, '')}?text=Hi`
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-8">
          {/* Business Avatar + Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl">
              {config.emoji}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{business.name}</h1>
              <p className="text-white/50 text-sm">{config.label}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {business.address && (
              <div className="flex items-start gap-2 text-white/60 text-sm">
                <span className="mt-0.5">📍</span>
                <span>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span>📞</span>
                <a href={`tel:${business.phone}`} className="hover:text-emerald-400 transition-colors">
                  {business.phone}
                </a>
              </div>
            )}
            <BusinessHours hours={business.business_hours} />
          </div>

          {business.description && (
            <p className="text-white/40 text-sm mt-4">{business.description}</p>
          )}
        </div>
      </header>

      {/* Menu / Services / Products */}
      <main className="max-w-2xl mx-auto px-4 pb-32">
        {business.menu_categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-white/40">
              {config.sidebar.menu} coming soon. Message us on WhatsApp for details!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {business.menu_categories.map((category) => (
              <section key={category.id}>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-4 rounded-full bg-emerald-500" />
                  {category.name}
                  <span className="text-white/30 text-sm font-normal">
                    ({category.items.length})
                  </span>
                </h2>

                <div className="space-y-3">
                  {category.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} businessType={business.business_type} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Sticky WhatsApp CTA */}
      {whatsappLink && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-lg border-t border-white/10 p-4">
          <div className="max-w-2xl mx-auto">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#22c55e] text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-[#25D366]/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {['salon_spa', 'healthcare', 'education', 'services'].includes(business.business_type)
                ? 'Book on WhatsApp'
                : 'Order on WhatsApp'}
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-4 pb-8 text-center">
        <div className="border-t border-white/5 pt-6">
          <Link
            href="/"
            className="text-white/20 hover:text-white/40 text-xs transition-colors inline-flex items-center gap-1"
          >
            Powered by <span className="font-semibold">AssistMint</span> 🌿
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Menu Item Card ─────────────────────────

function MenuItemCard({
  item,
  businessType,
}: {
  item: PublicBusinessData['menu_categories'][0]['items'][0];
  businessType: string;
}) {
  const priceLabel = businessType === 'education' ? 'Fee' : '';
  const priceInRupees = (item.price / 100).toFixed(0);

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
        item.is_available
          ? 'border-white/10 bg-white/5 hover:bg-white/[0.07] hover:border-white/15'
          : 'border-white/5 bg-white/[0.02] opacity-60'
      }`}
    >
      {/* Image */}
      {item.image_url && (
        <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden">
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {/* Veg/Non-veg indicator (only for food) */}
          {businessType === 'food_beverage' && (
            <div
              className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${
                item.is_veg
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-red-500 bg-red-500/20'
              } flex items-center justify-center`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  item.is_veg ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          )}
          <span className="text-sm font-medium text-white truncate">{item.name}</span>
        </div>

        {item.description && (
          <p className="text-xs text-white/40 line-clamp-2 mb-1">{item.description}</p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-400">
            ₹{priceInRupees}
            {priceLabel && <span className="text-white/30 text-xs font-normal ml-1">{priceLabel}</span>}
          </span>
          {!item.is_available && (
            <span className="text-xs text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Business Hours ─────────────────────────

function BusinessHours({ hours }: { hours: Record<string, { open: string; close: string }> }) {
  if (!hours || Object.keys(hours).length === 0) return null;

  const dayMap: Record<string, string> = {
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
    fri: 'Fri', sat: 'Sat', sun: 'Sun',
  };

  const today = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const todayHours = hours[today];

  if (!todayHours) return null;

  return (
    <div className="flex items-center gap-2 text-white/60 text-sm">
      <span>⏰</span>
      <span>
        Today: {todayHours.open} – {todayHours.close}
      </span>
    </div>
  );
}
