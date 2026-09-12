import { z } from "zod";

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: Response };

export async function parseJsonRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParseResult<T>> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return {
        success: false,
        response: Response.json(
          {
            error: "Invalid request body",
            issues: parsed.error.flatten(),
          },
          { status: 400 },
        ),
      };
    }

    return { success: true, data: parsed.data };
  } catch {
    return {
      success: false,
      response: Response.json({ error: "Request body must be JSON" }, { status: 400 }),
    };
  }
}

export function notFound(message: string) {
  return Response.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
