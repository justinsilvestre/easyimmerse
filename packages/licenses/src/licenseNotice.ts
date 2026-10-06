/** A license or attribution notice for the open-source licenses page. */
export interface LicenseNotice {
  title: string;
  text: string;
}

/** Notices that the licenses page lists under one heading, such as those of the Rust crates. */
export interface LicenseNoticeGroup {
  title: string;
  notices: readonly LicenseNotice[];
}
