import {
  Icon,
  IconBomb,
  IconBriefcaseFilled,
  IconCarCrash,
  IconCarFilled,
  IconFlame,
  IconFriends,
  IconGenderFemale,
  IconGrave,
  IconMoodAngry,
  IconQuestionMark,
  IconRoad,
  IconSlice
} from "@tabler/icons-react";

export interface ReportType {
  label: string;
  value: string;
  Icon: Icon;
  severity: number;
}

const reportTypes: ReportType[] = [
  {
    label: "Robo a mano armada",
    value: "robbery_with_violence",
    Icon: IconSlice,
    severity: 3,
  },
  {
    label: "Homicidio",
    value: "homicide",
    Icon: IconGrave,
    severity: 3,
  },
  {
    label: "Robo de vehículo",
    value: "vehicle_theft",
    Icon: IconCarFilled,
    severity: 2,
  },
  {
    label: "Violencia doméstica",
    value: "domestic_violence",
    Icon: IconFriends,
    severity: 3,
  },
  {
    label: "Acoso sexual",
    value: "sexual_harassment",
    Icon: IconMoodAngry,
    severity: 2,
  },
  {
    label: "Acoso laboral",
    value: "workplace_harassment",
    Icon: IconBriefcaseFilled,
    severity: 1,
  },
  {
    label: "Violencia de género",
    value: "gender_based_violence",
    Icon: IconGenderFemale,
    severity: 3,
  },
  {
    label: "Choque",
    value: "collision",
    Icon: IconCarCrash,
    severity: 2,
  },
  {
    label: "Incendio",
    value: "fire",
    Icon: IconFlame,
    severity: 3,
  },
  {
    label: "Atropello",
    value: "run_over",
    Icon: IconRoad,
    severity: 3,
  },
  {
    label: "Detonación",
    value: "detonation",
    Icon: IconBomb,
    severity: 3,
  },
  {
    label: "Otro",
    value: "other",
    Icon: IconQuestionMark,
    severity: 1,
  },
];

export default reportTypes;
