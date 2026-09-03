import { outfitById, dicebearUrl } from "../config/outfits";

type Props = {
  outfitId: string;
  mouth?: "smile" | "default" | "concerned";
  size?: number;
};

export function BuddyAvatar({ outfitId, mouth = "smile", size = 120 }: Props) {
  const outfit = outfitById(outfitId);
  const url = dicebearUrl(outfit, mouth);

  return (
    <div className="buddy-avatar-wrap" style={{ width: size, height: size }}>
      <img src={url} alt="EcoBuddy" width={size} height={size} />
    </div>
  );
}
