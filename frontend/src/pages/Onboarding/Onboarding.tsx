import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateProfileStep from './steps/CreateProfileStep';
import AddPetStep from './steps/AddPetStep';
import VerifyStep from './steps/VerifyStep';

import './Onboarding.css';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

const STEPS = {
  PET: 0,
  PROFILE: 1,
  VERIFY: 2,
};

const TOTAL_STEPS = 3;

export default function Onboarding() {
  const [step, setStep] = useState(STEPS.PET);

  const [petData, setPetData] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const navigate = useNavigate();

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const handleFinish = async () => {
    if (!petData || !profileData) {
      setSaveError('Some onboarding information is missing.');
      return;
    }

    const petAge = Number(petData.age);

    if (!Number.isFinite(petAge) || petAge < 0) {
      setSaveError('Please enter a valid pet age.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const profileResponse = await fetch(`${API_URL}/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: profileData.location,
          bio: profileData.bio,
          interests: profileData.interests ?? [],
          latitude: profileData.latitude ?? null,
          longitude: profileData.longitude ?? null,
        }),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => null);

        throw new Error(
          errorData?.message || 'Failed to save your profile.'
        );
      }

      const petResponse = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pet_name: petData.petName,
          animal_type: petData.animalType,
          size: petData.size,
          pet_age: petAge,
          energy_level: petData.energyLevel,
          about_me: petData.aboutMe,
          pet_photo: petData.photoUrl,
        }),
      });

      if (!petResponse.ok) {
        const errorData = await petResponse.json().catch(() => null);

        throw new Error(
          errorData?.message || 'Failed to save your pet.'
        );
      }

      navigate('/discover');
    } catch (error) {
      console.error('Onboarding save failed:', error);

      setSaveError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-container">

        <div className="onboarding-progress">
          <div
            className="onboarding-progress__bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="onboarding-steps">
          {Array.from({ length: TOTAL_STEPS }, (_, stepNumber) => (
            <div
              key={stepNumber}
              className={`onboarding-step ${stepNumber === step ? 'active' : ''
                }`}
            >
              {stepNumber + 1}
            </div>
          ))}
        </div>

        <div className="onboarding-content">

          {step === STEPS.PET && (
            <AddPetStep
              onNext={(data) => {
                setPetData(data);
                setSaveError('');
                setStep(STEPS.PROFILE);
              }}
            />
          )}

          {step === STEPS.PROFILE && (
            <CreateProfileStep
              onBack={() => setStep(STEPS.PET)}
              onNext={(data) => {
                setProfileData(data);
                setSaveError('');
                setStep(STEPS.VERIFY);
              }}
            />
          )}

          {step === STEPS.VERIFY && (
            <VerifyStep
              petData={petData}
              profileData={profileData}
              saving={saving}
              saveError={saveError}
              onBack={() => setStep(STEPS.PROFILE)}
              onFinish={handleFinish}
            />
          )}

        </div>
      </div>
    </main>
  );
}