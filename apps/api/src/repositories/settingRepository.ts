import { SETTING_KEYS, SiteSetting, type SiteSettingDocument } from "@/models/SiteSetting";

export const settingRepository = {
  async get(key: string): Promise<SiteSettingDocument | null> {
    return SiteSetting.findOne({ key });
  },

  async upsert(key: string, value: unknown, updatedBy: string | null): Promise<SiteSettingDocument> {
    const document = await SiteSetting.findOneAndUpdate(
      { key },
      { $set: { value, updatedBy } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return document;
  },

  async getBusiness(): Promise<unknown | null> {
    const document = await this.get(SETTING_KEYS.business);
    return document?.value ?? null;
  },
};
