/** Làm mới cả React Query cache lẫn loader của router (các trang đọc từ loader data). */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export const useRefreshCatalog = () => {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    await qc.refetchQueries({ queryKey: ["catalog"] });
    await router.invalidate();
  };
};
