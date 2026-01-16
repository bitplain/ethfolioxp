export function roleForFirstUser(count: number) {
  return count === 0 ? "ADMIN" : "USER";
}
