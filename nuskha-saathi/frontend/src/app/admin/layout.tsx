import type { Metadata } from "next";

/**
 * /admin is reachable only by typing the address. Nothing in the app links
 * to it, and search engines are told not to index it.
 */
export const metadata: Metadata = {
  title: "Nuskha Saathi · Backend",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
