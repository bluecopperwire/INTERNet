import { PageHero } from '../../../components/PageHero'

interface EmployerHeroProps {
  title: string
  subtitle: string
  comfortableSpacing?: boolean
}

export function EmployerHero({ title, subtitle }: EmployerHeroProps) {
  return <PageHero title={title} subtitle={subtitle} />
}

