/**
 * Làm mới dữ liệu catalog sau khi admin thay đổi nội dung.
 * Các query key đều bắt đầu bằng "catalog" nên chỉ cần invalidate theo tiền tố,
 * React Query sẽ refetch những query đang hiển thị và đánh dấu phần còn lại là cũ.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { catalogKeys } from "@/data/catalog.queries";

export const useRefreshCatalog = () => {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: catalogKeys.all }),
      qc.invalidateQueries({ queryKey: catalogKeys.dealerPrices }),
    ]);
    await router.invalidate();
  };
};
