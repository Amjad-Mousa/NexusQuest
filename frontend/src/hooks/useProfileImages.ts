import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9876/api';

export function useProfileImages() {
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    const loadUserImages = async () => {
      try {
        const token = localStorage.getItem('nexusquest-token');
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.user) {
          setAvatarImage(data.user.avatarImage || null);
          setCoverImage(data.user.coverImage || null);
        }
      } catch (error) {
        console.error('Failed to load user images:', error);
      }
    };
    loadUserImages();
  }, []);

  const updateImage = async (type: 'avatar' | 'cover', imageData: string) => {
    try {
      const token = localStorage.getItem('nexusquest-token');
      const response = await fetch(`${API_BASE}/auth/profile/images`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatarImage: type === 'avatar' ? imageData : avatarImage,
          coverImage: type === 'cover' ? imageData : coverImage
        })
      });
      const data = await response.json();
      if (data.success) {
        if (type === 'avatar') setAvatarImage(imageData);
        else setCoverImage(imageData);
        return true;
      } else {
        console.error(`Failed to update ${type}:`, data.error);
        alert(`Failed to update ${type}: ${data.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
      alert(`Failed to update ${type}. Please check console for details.`);
      return false;
    }
  };

  const handleImageChange = (type: 'avatar' | 'cover') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        await updateImage(type, imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  return {
    avatarImage,
    coverImage,
    handleAvatarChange: handleImageChange('avatar'),
    handleCoverChange: handleImageChange('cover')
  };
}

