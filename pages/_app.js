/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import '../src/styles/globals.css';
import { AURA_PROVENANCE } from '../src/lib/provenance';
// Keep the provenance marker in the runtime bundle so any built copy carries it.
if (typeof window !== 'undefined') {
  window.__AURA_PROVENANCE__ = AURA_PROVENANCE;
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
