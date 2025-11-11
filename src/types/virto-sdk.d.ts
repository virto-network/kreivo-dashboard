declare module '@virtonetwork/sdk' {
  interface SDKConfig {
    federate_server: string;
    provider_url: string;
    config: {
      wallet: string;
    };
  }

  interface User {
    profile: {
      id: string;
      name: string;
      displayName: string;
    };
    metadata: Record<string, any>;
  }

  interface AuthMethods {
    isRegistered(username: string): Promise<boolean>;
    register(user: User): Promise<any>;
    login(username: string): Promise<any>;
    logout(): Promise<void>;
  }

  class SDK {
    auth: AuthMethods;
    
    constructor(config: SDKConfig);
  }

  export default SDK;
  export { SDKConfig, User, AuthMethods };
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'virto-input': {
        type?: string;
        placeholder?: string;
        value?: string;
        onInput?: (event: any) => void;
        disabled?: boolean;
        style?: React.CSSProperties;
      };
      'virto-button': {
        label?: string;
        onClick?: () => void;
        disabled?: boolean;
        style?: React.CSSProperties;
      };
    }
  }
} 