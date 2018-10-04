import { Tracy } from './Tracy';

export * from './Tracy';
export * from './Logger';
export * from './exceptions';

const tracy = new Tracy();
export default tracy;
