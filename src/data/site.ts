import avatarUrl from "../../profile-photo.png";
import bigDataImageUrl from "../../pub-bigdata.png";
import iclrImageUrl from "../../pub-iclr.png";

export type Publication = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  image: string;
  abstract: string;
  links: Array<{ label: string; href: string }>;
};

export const profile = {
  name: "Ruochen Mao",
  role: "Researcher and Software Engineer",
  email: "ruochenmao@163.com",
  avatar: avatarUrl,
  focus:
    "Human-Computer Interaction (HCI), Human-AI Interaction, Social Computing, and Trustworthy AI.",
  bio: [
    "Hi, I am Ruochen Mao. My research sits at the intersection of Human-Computer Interaction (HCI), Human-AI Interaction, Social Computing, and Trustworthy AI.",
    "I received both my B.S. and M.S. degrees in Computer Science from the University of Melbourne. I worked as a Research Assistant at HKUST (Guangzhou), supervised by Jiaheng Wei, and at City University of Hong Kong, supervised by Ray LC.",
    "Before that, I worked as a full-time Software Engineer at China Aerospace Science and Technology Corporation, and also worked as a Data Scientist Intern at JD and Cultural Infusion (Australia).",
  ],
  seeking:
    "I am currently looking for PhD positions and full-time opportunities. If you are interested in collaboration, please feel free to reach out.",
  socials: [
    {
      label: "Google Scholar",
      href: "https://scholar.google.ca/citations?view_op=list_works&hl=en&user=ZH2u7gUAAAAJ",
    },
    { label: "GitHub", href: "https://github.com/rcmao" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/ruochen-mao-6b8a8a187/" },
  ],
};

export const publications: Publication[] = [
  {
    id: "iclr-2026",
    title: "Robust Preference Alignment via Directional Neighborhood Consensus",
    authors: "Ruochen Mao, Yuling Shi, Xiaodong Gu, Jiaheng Wei",
    venue: "ICLR 2026",
    image: iclrImageUrl,
    abstract:
      "This work studies robust preference alignment by checking whether local directional neighborhoods agree before updating model behavior. The retro desk presents it as the main paper artifact hidden inside the book object.",
    links: [
      { label: "PDF", href: "https://arxiv.org/pdf/2510.20498" },
      { label: "arXiv", href: "https://arxiv.org/abs/2510.20498" },
    ],
  },
  {
    id: "bigdata-2023",
    title:
      "Developing a Large-Scale Language Model to Unveil and Alleviate Gender and Age Biases in Australian Job Ads",
    authors: "Ruochen Mao, Liming Tan, Rezza Moieni, Nicole Lee",
    venue: "IEEE Big Data 2023",
    image: bigDataImageUrl,
    abstract:
      "This project uses language models to surface and reduce gender and age bias in Australian job advertisements, connecting applied NLP with trustworthy and socially aware AI systems.",
    links: [
      { label: "PDF", href: "https://ieeexplore.ieee.org/abstract/document/10386083" },
      {
        label: "Code",
        href: "https://github.com/rcmao/Analyzing-Gender-and-Age-Bias-in-Employment-Ads",
      },
    ],
  },
];

export const deskNotes = [
  "书本里夹着论文摘要，点击可以翻出研究线索。",
  "CD 播放机使用浏览器合成器生成轻微复古环境声，不依赖外部音频文件。",
  "小宠物负责提示：Tripo3D 模型之后只要替换 public/models 资源即可。",
];
