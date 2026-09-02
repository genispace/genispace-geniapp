export interface Model {
    id: string;
    identifier: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    features: string[];
    pricing?: string;
    latency?: string;
    userConfigurableParams: Record<string, unknown>;
    supportedFeatures: Record<string, unknown>;

    supportsMultimodal?: boolean;
    supportedContentTypes?: string[];
    multimodalConfig?: {
      maxImageSize?: number;
      maxAudioDuration?: number;
      supportedImageFormats?: string[];
      supportedAudioFormats?: string[];
      imageProcessingOptions?: Record<string, unknown>;
      audioProcessingOptions?: Record<string, unknown>;
    };
  }