import QCPesoHero from '../components/QCPesoHero'

interface QCPesoSectionPageProps {
  title: string
  subtitle: string
}

export function QCPesoSectionPage({ title, subtitle }: QCPesoSectionPageProps) {
  return (
    <main>
      <QCPesoHero title={title} subtitle={subtitle} />
    </main>
  )
}
