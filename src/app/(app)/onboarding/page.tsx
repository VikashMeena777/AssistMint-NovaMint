import { Metadata } from 'next';
import OnboardingWizard from '@/components/onboarding/onboarding-wizard';

export const metadata: Metadata = {
  title: 'Get Started — AssistMint',
  description: 'Set up your AI-powered WhatsApp ordering assistant in minutes.',
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
