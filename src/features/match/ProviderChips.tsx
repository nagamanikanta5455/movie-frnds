import { motion } from 'framer-motion';
import { useWatchProviders, type Provider } from '@/features/tmdb/useWatchProviders';

const logo = (p: string) => `https://image.tmdb.org/t/p/w92${p}`;

function Row({ label, items, href }: { label: string; items: Provider[]; href?: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p, i) => (
          <motion.a
            key={p.provider_id}
            href={href} target="_blank" rel="noreferrer"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 28 }}
            whileTap={{ scale: 0.92 }}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 py-1.5 pl-1.5 pr-3 backdrop-blur-xl"
          >
            <img src={logo(p.logo_path)} alt="" className="h-7 w-7 rounded-full" />
            <span className="text-sm text-white">{p.provider_name}</span>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

export function ProviderChips({ movieId, region }: { movieId: number; region: string }) {
  const { data, loading } = useWatchProviders(movieId, region);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-10 w-28 animate-pulse rounded-full bg-white/10" />)}
      </div>
    );
  }
  if (!data || (!data.stream.length && !data.rent.length && !data.buy.length)) {
    return <p className="text-sm text-white/50">Not available to stream in {region} right now.</p>;
  }
  return (
    <div className="mt-6 space-y-4">
      <Row label="Stream" items={data.stream} href={data.link} />
      <Row label="Rent" items={data.rent.slice(0, 4)} href={data.link} />
      <Row label="Buy" items={data.buy.slice(0, 4)} href={data.link} />
      <p className="pt-1 text-[10px] text-white/30">Streaming data by JustWatch</p>
    </div>
  );
}