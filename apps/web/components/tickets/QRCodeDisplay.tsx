import Image from "next/image";

type QRCodeDisplayProps = {
  imageDataUrl: string;
  altText: string;
};

export function QRCodeDisplay({ imageDataUrl, altText }: QRCodeDisplayProps) {
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Image
        src={imageDataUrl}
        alt={altText}
        width={320}
        height={320}
        unoptimized
        className="h-auto w-full"
      />
    </div>
  );
}
