import { describe, expect, it } from "vitest";
import {
  ADMIN_ORDER_COPY,
  validateAdminOrder,
  type AdminOrderInput,
} from "../../src/lib/admin-order";

const ORDER: AdminOrderInput = {
  fullName: "Léa Martin",
  email: "",
  covers: 2,
  vg: 1,
  paymentMethod: "tpe",
  sendEmail: false,
};

describe("validateAdminOrder", () => {
  it("accepts an order without email", () => {
    expect(validateAdminOrder(ORDER)).toStrictEqual({});
  });

  it("checks the name, the email when given, and the payment method", () => {
    expect(
      validateAdminOrder({
        ...ORDER,
        fullName: " L ",
        email: "lea@",
        paymentMethod: null,
      }),
    ).toStrictEqual({
      fullName: ADMIN_ORDER_COPY.fullName,
      email: ADMIN_ORDER_COPY.email,
      paymentMethod: ADMIN_ORDER_COPY.paymentMethod,
    });
  });

  it("accepts any number of covers for a manual row", () => {
    expect(validateAdminOrder({ ...ORDER, covers: 12, vg: 12 })).toStrictEqual(
      {},
    );
  });

  it.each([0, -1, 1.5, Number.NaN])("refuses %j covers", (covers) => {
    expect(validateAdminOrder({ ...ORDER, covers, vg: 0 })).toStrictEqual({
      covers: ADMIN_ORDER_COPY.covers,
    });
  });

  it.each([-1, 0.5, 3, Number.NaN])("refuses %j VG for 2 covers", (vg) => {
    expect(validateAdminOrder({ ...ORDER, vg })).toStrictEqual({
      vg: ADMIN_ORDER_COPY.vg,
    });
  });

  it("does not judge the VG count while the covers are wrong", () => {
    expect(
      validateAdminOrder({ ...ORDER, covers: Number.NaN, vg: 1 }),
    ).toStrictEqual({ covers: ADMIN_ORDER_COPY.covers });
  });
});
