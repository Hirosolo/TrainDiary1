import { useNavigate } from 'react-router-dom';
import Navbar from "../components/NavBar/NavBar";
import HeroSection from "../components/HeroSection/HeroSection";
import { PageContainer } from '../components/shared/SharedComponents';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleLearnMore = () => {
    const featuresSection = document.querySelector('.features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <PageContainer>
      <Navbar />
      <HeroSection 
        onGetStarted={handleGetStarted}
        onLearnMore={handleLearnMore}
      />
    </PageContainer>
  );
}
