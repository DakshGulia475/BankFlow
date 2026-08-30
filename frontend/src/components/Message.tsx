type MessageProps = {
  tone: 'error' | 'success';
  children: string;
};

export function Message({ tone, children }: MessageProps) {
  return (
    <p className={`message message-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
