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
          setImages((images) => [...images, { file: message.file, fit: message.fit }]);
          break;
        case 'image_hide':
          if (message.file) {
            setImages((images) => images.filter(({ file }) => file !== message.file));
          } else {
            setImages([]);
          }
          break;
      }
    }, [])
  );

  return images;
}
