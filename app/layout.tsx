import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'TerraRotate AI | NASA Space Apps 2026', description:'Transparent NASA-informed crop rotation decision support for farmers'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
