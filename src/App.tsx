import React from 'react';
import { ExperimentProvider } from './contexts/ExperimentContext';
import { SiteHeader } from './components/SiteHeader';
import { HeroSection } from './components/HeroSection';
import { MarketFeed } from './components/MarketFeed';
import { AbilitiesSection } from './components/AbilitiesSection';
import { LiveExperimentFeed } from './components/LiveExperimentFeed';
import { InternetAccessSection } from './components/InternetAccessSection';
import { CommunicationSection } from './components/CommunicationSection';
import { EmergenceTreeSection } from './components/EmergenceTreeSection';
import { GenomeSection } from './components/GenomeSection';
import { EvolutionSection } from './components/EvolutionSection';
import { BigIdeaSection } from './components/BigIdeaSection';
import { SiteFooter } from './components/SiteFooter';
import { EventFlash } from './components/EventFlash';
import { DevSimPanel } from './components/DevSimPanel';

export function App() {
  return (
    <ExperimentProvider>
      <div className="relative w-full min-h-screen bg-void-950 text-slate-300 font-mono antialiased">
        <div className="pointer-events-none fixed inset-0 z-[45] bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6))]" />

        <SiteHeader />
        <EventFlash />

        <main>
          <HeroSection />
          <MarketFeed />
          <AbilitiesSection />
          <LiveExperimentFeed />
          <InternetAccessSection />
          <CommunicationSection />
          <EmergenceTreeSection />
          <GenomeSection />
          <EvolutionSection />
          <BigIdeaSection />
        </main>

        <SiteFooter />
        <DevSimPanel />
      </div>
    </ExperimentProvider>
  );
}
