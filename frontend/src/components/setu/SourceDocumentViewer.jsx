// "Open the source document" for a deadline. Reuses the existing viewers:
// DocumentViewerModal for Admin/Officer, CitizenDocumentModal for a Citizen
// (each role's own API returns a different document shape, so the right one is
// fetched before the matching modal opens).
import { useCallback, useState } from "react";
import DocumentViewerModal from "../documents/DocumentViewerModal";
import CitizenDocumentModal from "../citizen/CitizenDocumentModal";
import { getDocumentRequest } from "../../api/documents";
import { getCitizenDocumentRequest } from "../../api/citizen";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

export function useSourceDocument() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isStaff = user?.role === "Admin" || user?.role === "Officer";
  const [doc, setDoc] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const openDocument = useCallback(
    async (documentId) => {
      setLoadingId(documentId);
      try {
        const { data } = await (isStaff ? getDocumentRequest(documentId) : getCitizenDocumentRequest(documentId));
        setDoc(data);
      } catch {
        showToast("That document could not be opened. It may have been deleted.", "error");
      } finally {
        setLoadingId(null);
      }
    },
    [isStaff, showToast]
  );

  const close = useCallback(() => setDoc(null), []);
  const Viewer = isStaff ? DocumentViewerModal : CitizenDocumentModal;
  const viewer = <Viewer isOpen={Boolean(doc)} onClose={close} document={doc} />;

  return { openDocument, loadingId, viewer };
}
