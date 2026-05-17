import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { playMailSendSound } from "../audio/mailSend";
import { MESSAGE_TREE_LABEL } from "../data/messageTree";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";

type MessageTreePanelProps = {
  open: boolean;
  onClose: () => void;
};

function MessageTreePanel({ open, onClose }: MessageTreePanelProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setMessage("");
    setContact("");
    setStatus("idle");
    setErrorText(null);
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !message.trim()) {
      setStatus("error");
      setErrorText("Please fill in your name and message.");
      return;
    }
    if (!accessKey) {
      setStatus("error");
      setErrorText("This form is not configured yet (missing VITE_WEB3FORMS_ACCESS_KEY).");
      return;
    }

    setStatus("submitting");
    setErrorText(null);

    const c = contact.trim();
    const payload: Record<string, string> = {
      access_key: accessKey,
      subject: `[${MESSAGE_TREE_LABEL}] ${name.trim()}`,
      name: name.trim(),
      message: message.trim(),
    };

    if (c) {
      payload.contact = c;
      if (c.includes("@")) {
        payload.email = c;
      }
    }

    try {
      const res = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await res.json()) as { success?: boolean; message?: string };

      if (!res.ok || body.success === false) {
        const msg =
          typeof body.message === "string" && body.message.length > 0
            ? body.message
            : `Could not send (${res.status})`;
        throw new Error(msg);
      }

      playMailSendSound();
      setStatus("success");
      setName("");
      setMessage("");
      setContact("");
    } catch (err) {
      setStatus("error");
      setErrorText(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="desk-music-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="message-tree-panel"
            role="dialog"
            aria-modal="true"
            aria-label={MESSAGE_TREE_LABEL}
            initial={{ y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="message-tree-panel-header">
              <div className="message-tree-panel-titleblock">
                <h2 className="message-tree-title">{MESSAGE_TREE_LABEL}</h2>
                <p className="message-tree-subtitle">Leave a note by the sakura — I’ll read every message.</p>
              </div>
              <button type="button" className="desk-music-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </header>

            <div className="message-tree-panel-body">
              {status === "success" ? (
                <div className="message-tree-success-block">
                  <p className="message-tree-success-text">Thanks — your note is on its way.</p>
                  <button type="button" className="message-tree-primary-btn" onClick={onClose}>
                    Close
                  </button>
                </div>
              ) : (
                <form className="message-tree-form" onSubmit={submit} noValidate>
                  <p className="message-tree-intro">
                    Fields marked with <span className="message-tree-asterisk" aria-hidden>*</span> are required.
                    Optional contact helps if you’d like a reply. Nothing is kept on this site.
                  </p>
                  <div className="message-tree-field">
                    <label htmlFor="message-tree-name">
                      Name{" "}
                      <abbr className="message-tree-required-mark" title="required">
                        *
                      </abbr>
                    </label>
                    <input
                      id="message-tree-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={120}
                      placeholder="Your name"
                      className="message-tree-input"
                      aria-required="true"
                    />
                  </div>
                  <div className="message-tree-field">
                    <label htmlFor="message-tree-body">
                      Message{" "}
                      <abbr className="message-tree-required-mark" title="required">
                        *
                      </abbr>
                    </label>
                    <textarea
                      id="message-tree-body"
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      maxLength={4000}
                      rows={8}
                      placeholder="Say anything you like…"
                      className="message-tree-textarea"
                      aria-required="true"
                    />
                  </div>
                  <div className="message-tree-field message-tree-field--optional">
                    <label htmlFor="message-tree-contact">Contact (optional)</label>
                    <input
                      id="message-tree-contact"
                      name="contact"
                      type="text"
                      autoComplete="off"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      maxLength={240}
                      placeholder="Email, @handle, or link"
                      className="message-tree-input"
                    />
                  </div>
                  {status === "error" && errorText ? (
                    <p className="message-tree-error" role="alert">
                      {errorText}
                    </p>
                  ) : null}
                  <div className="message-tree-actions">
                    <button type="submit" className="message-tree-primary-btn" disabled={status === "submitting"}>
                      {status === "submitting" ? "Sending…" : "Send"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default MessageTreePanel;
