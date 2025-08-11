import GeoWatcher from "@/components/GeoWatcher";

export default function Home() {
  return (
    <main className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <h1 className="text-2xl font-bold">Your Location</h1>
      <GeoWatcher />
      <p>I'm watching you</p>
    </main>
  );
}