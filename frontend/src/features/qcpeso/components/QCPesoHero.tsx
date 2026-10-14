import { PageHero } from '../../../components/PageHero'

interface QCPesoHeroProps {
  title?: string
  subtitle?: string
  comfortableSpacing?: boolean
}

export function QCPesoHero({
  title = 'Monitor User',
  subtitle = 'QCPESO Referral Monitoring',
}: QCPesoHeroProps) {
  return <PageHero title={title} subtitle={subtitle} />
}

export default QCPesoHero
