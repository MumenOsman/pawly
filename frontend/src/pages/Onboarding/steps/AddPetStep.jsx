import { useState } from 'react';
import Button from '../../../components/Button/Button';
import './AddPetStep.css';

export default function AddPetStep({ onNext }) {
  const [petName, setPetName] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [size, setSize] = useState('');
  const [age, setAge] = useState('');
  const [energyLevel, setEnergyLevel] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const petAge = Number(age);

    if (!Number.isFinite(petAge) || petAge < 0) {
      return;
    }

    onNext({
      petName: petName.trim(),
      animalType: animalType.trim(),
      size,
      age: petAge,
      energyLevel,
      aboutMe: aboutMe.trim(),
      photoUrl: photoUrl.trim(),
    });
  };

  return (
    <form
      className="add-pet-form"
      onSubmit={handleSubmit}
    >
      <h1>Add your pet</h1>

      <label htmlFor="pet-name">Pet name</label>
      <input
        id="pet-name"
        type="text"
        value={petName}
        onChange={(e) => setPetName(e.target.value)}
        placeholder="Your pet's name"
        required
      />

      <label htmlFor="animal-type">Animal type</label>
      <input
        id="animal-type"
        type="text"
        value={animalType}
        onChange={(e) => setAnimalType(e.target.value)}
        placeholder="e.g. Dog, Cat, Rabbit..."
        required
      />

      <label htmlFor="size">Size</label>
      <select
        id="size"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        required
      >
        <option value="">Select size</option>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>

      <label htmlFor="age">Age</label>
      <input
        id="age"
        type="number"
        min="0"
        step="1"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        required
      />

      <label htmlFor="energy-level">Energy level</label>
      <select
        id="energy-level"
        value={energyLevel}
        onChange={(e) => setEnergyLevel(e.target.value)}
        required
      >
        <option value="">Select energy level</option>
        <option value="low">Low</option>
        <option value="moderate">Moderate</option>
        <option value="high">High</option>
      </select>

      <label htmlFor="about-me">About your pet</label>
      <textarea
        id="about-me"
        value={aboutMe}
        onChange={(e) => setAboutMe(e.target.value)}
        rows={4}
        placeholder="Tell us a little about your pet..."
      />

      <label htmlFor="photo-url">Pet photo URL</label>
      <input
        id="photo-url"
        type="url"
        value={photoUrl}
        onChange={(e) => setPhotoUrl(e.target.value)}
        placeholder="https://..."
      />

      <div className="add-pet-actions">
        <Button type="submit">
          Continue
        </Button>
      </div>
    </form>
  );
}