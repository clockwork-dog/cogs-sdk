import { CogsConnection, MediaObjectFit, CogsClientMessage } from '@clockworkdog/cogs-client';
import { useCallback, useState } from 'react';
import useCogsMessage from './useCogsMessage';

export type Image = { file: string; fit: MediaObjectFit };

export default function useImages(connection: CogsConnection): Image[] {
  const [images, setImages] = useState<Image[]>([]);

  useCogsMessage(
    connection,
    useCallback((message: CogsClientMessage) => {
      switch (message.type) {
        case 'image_show':
          {
            const newImage = { file: message.file, fit: message.fit };
            setImages((images) => (message.hideOthers ? [newImage] : [...images, newImage]));
          }
          break;
        case 'image_hide':
          if (message.file) {
            setImages((images) => images.filter(({ file }) => file !== message.file));
          } else {
            setImages([]);
          }
          break;
        case 'image_set_fit':
          setImages((images) => images.map((image) => (!message.file || message.file === image.file ? { ...image, fit: message.fit } : image)));
          break;
      }
    }, [])
  );

  return images;
}
