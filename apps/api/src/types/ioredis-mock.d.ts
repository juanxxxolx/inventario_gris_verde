declare module 'ioredis-mock' {
  import type Redis from 'ioredis';

  class RedisMock extends Redis {}

  export default RedisMock;
}
