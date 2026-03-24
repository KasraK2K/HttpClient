interface HTMLPreviewProps {
  value: string;
}

export function HTMLPreview({ value }: HTMLPreviewProps) {
  return <iframe className="h-[360px] w-full rounded-xl border border-white/10 bg-white" sandbox="allow-same-origin" srcDoc={value} title="HTML preview" />;
}
