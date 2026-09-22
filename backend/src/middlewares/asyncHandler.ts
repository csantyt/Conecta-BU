import type { Request, Response } from "express";

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

export function asyncHandler(handler: AsyncRoute) {
  return (req: Request, res: Response): void => {
    void handler(req, res).catch((error: unknown) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error interno del servidor." });
      }
    });
  };
}
