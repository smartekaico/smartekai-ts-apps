import * as React from "react";
interface TeamInvitationEmailProps {
    inviterName: string;
    inviterEmail: string;
    orgName: string;
    inviteLink: string;
}
export declare const TeamInvitationEmail: ({ inviterName, inviterEmail, orgName, inviteLink, }: TeamInvitationEmailProps) => React.JSX.Element;
export default TeamInvitationEmail;
