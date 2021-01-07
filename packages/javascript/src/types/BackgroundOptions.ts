import MediaObjectFit from './MediaObjectFit';

export default interface BackgroundOptions {
  color: string;
  image?: {
    file: string;
    fit: MediaObjectFit;
  };
}
