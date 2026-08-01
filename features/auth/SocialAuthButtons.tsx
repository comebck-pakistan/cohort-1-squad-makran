import styles from "./AuthCard.module.css";

interface SocialAuthButtonsProps {
  googleLabel: string;
  githubLabel: string;
  onGoogle: () => void;
  onGithub: () => void;
}

export function SocialAuthButtons({ googleLabel, githubLabel, onGoogle, onGithub }: SocialAuthButtonsProps) {
  return (
    <>
      <button className={styles.socialButton} onClick={onGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9.1h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.5-9.5 6.5-16.8z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41 15.4 46 24 46z" />
          <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 7 2.5 10l7.3-5.8z" />
          <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 7 4.5 14l7.3 5.7c1.7-5.1 6.5-8.9 12.2-8.9z" />
        </svg>
        {googleLabel}
      </button>
      <button className={styles.socialButton} onClick={onGithub}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.5">
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 8v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 6.7 5.4 7 5.4 7a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 13.4c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {githubLabel}
      </button>
    </>
  );
}
