declare module 'telegraf' {
    interface Context {
      session?: {
        
        test: number
        dialog?: {
          name: string;
          step: string;
          
          payload?: any;
        };
      };
    }
  }