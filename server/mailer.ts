import nodemailer from "nodemailer";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
};

export type Mailer = { send: (mail: Mail) => Promise<void> };

export const createMailer = ({
  user,
  appPassword,
  from,
}: {
  user: string;
  appPassword: string;
  from: string;
}): Mailer => {
  // Short timeouts make a stalled Gmail connection throw (and release the
  // email claim) before the serverless function is killed.
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 6000,
  });

  return {
    send: async (mail) => {
      await transport.sendMail({ from, ...mail });
    },
  };
};
