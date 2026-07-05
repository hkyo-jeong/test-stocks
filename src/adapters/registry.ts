import { BrokerageAdapter } from './BrokerageAdapter';
import { MockAdapter } from './mock/MockAdapter';

export type BrokerageName = 'toss' | 'kis' | 'mock';

export function createAdapter(name: BrokerageName = 'mock'): BrokerageAdapter {
  switch (name) {
    case 'toss': {
      // 런타임에 임포트하여 환경변수 검증을 지연
      const { TossAdapter } = require('./toss/TossAdapter');
      return new TossAdapter();
    }
    case 'kis': {
      const { KISAdapter } = require('./kis/KISAdapter');
      return new KISAdapter();
    }
    case 'mock':
    default:
      return new MockAdapter();
  }
}
